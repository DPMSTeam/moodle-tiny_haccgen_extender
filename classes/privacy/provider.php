<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace tiny_haccgen_extender\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\metadata\provider as metadata_provider;

/**
 * Privacy subsystem implementation for tiny_haccgen_extender.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements metadata_provider {
    /**
     * Describes data exported to external services.
     *
     * @param collection $items Metadata collection.
     * @return collection
     */
    public static function get_metadata(collection $items): collection {
        $items->add_external_location_link(
            'haccgen_api',
            [
                'userid' => 'privacy:metadata:external:userid',
                'userinput' => 'privacy:metadata:external:userinput',
            ],
            'privacy:metadata:external'
        );

        return $items;
    }
}
